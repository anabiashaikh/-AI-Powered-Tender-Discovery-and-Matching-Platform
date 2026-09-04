import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'assistant',
})
export class AssistantGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AssistantGateway.name);
  private audioBuffers: Map<string, Buffer[]> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(private readonly assistantService: AssistantService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket Assistant: ${client.id}`);
    this.audioBuffers.set(client.id, []);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket Assistant: ${client.id}`);
    this.audioBuffers.delete(client.id);
  }

  // Text Chat Streaming Handler
  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; question: string },
  ) {
    const { userId, question } = payload;
    if (!userId || !question) {
      client.emit('error', 'Missing userId or question');
      return;
    }

    try {
      this.logger.log(`Streaming chat for user ${userId}: "${question}"`);
      
      client.emit('chat-response-start');

      await this.assistantService.askQuestionStream(userId, question, (chunk: string) => {
        client.emit('chat-response-chunk', chunk);
      });

      client.emit('chat-response-end');
    } catch (error) {
      this.logger.error(`Error streaming message: ${error.message}`);
      client.emit('error', 'An error occurred during response generation.');
    }
  }

  // Voice Audio Streaming Handler: Client sends audio chunks as base64 strings
  @SubscribeMessage('audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { audioBase64: string },
  ) {
    const bufferList = this.audioBuffers.get(client.id);
    if (!bufferList) return;

    try {
      const chunk = Buffer.from(payload.audioBase64, 'base64');
      bufferList.push(chunk);
    } catch (err) {
      this.logger.error(`Failed to handle audio chunk: ${err.message}`);
    }
  }

  // Voice Interaction End: Client indicates they finished speaking
  @SubscribeMessage('audio-end')
  async handleAudioEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    const { userId } = payload;
    const bufferList = this.audioBuffers.get(client.id);

    if (!userId || !bufferList || bufferList.length === 0) {
      client.emit('error', 'Audio input empty or missing user details');
      return;
    }

    try {
      this.logger.log(`Audio recording finished. Processing voice command for user ${userId}...`);
      
      client.emit('voice-processing');

      // Concatenate all audio buffers
      const completeBuffer = Buffer.concat(bufferList);
      
      // Clear client audio list for next request
      this.audioBuffers.set(client.id, []);

      // 1. Transcribe audio using Whisper
      const transcription = await this.assistantService.transcribeAudio(completeBuffer);
      if (!transcription || transcription.trim() === '') {
        client.emit('voice-response', {
          textResponse: "I could not hear you clearly. Please try speaking again.",
        });
        return;
      }

      client.emit('voice-transcription', transcription);
      this.logger.log(`Transcribed voice query: "${transcription}"`);

      // 2. Process command (find, explain, deadlines, or general QA)
      const response = await this.assistantService.processVoiceCommand(userId, transcription);

      // 3. Synthesize speech for response
      const audioResponseBuffer = await this.assistantService.synthesizeSpeech(response.textResponse);

      // 4. Return text transcription, final text answer, base64 audio response, and any command details
      client.emit('voice-response', {
        transcription,
        textResponse: response.textResponse,
        audioBase64: audioResponseBuffer.toString('base64'),
        actionData: response.actionData,
      });

    } catch (error) {
      this.logger.error(`Error processing voice: ${error.message}`);
      client.emit('error', 'Failed to process voice request. Please try again.');
    }
  }
}
