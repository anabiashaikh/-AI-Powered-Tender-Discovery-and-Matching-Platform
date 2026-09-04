import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: any = null;
  private bucketName = 'tender-discovery-platform';
  private useLocalFallback = true;
  private localStorageDir = '';

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET') || 'tender-discovery-platform';
    this.localStorageDir = path.join(process.cwd(), 'uploads');
  }

  async onModuleInit() {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');

    if (endpoint && accessKeyId && secretAccessKey) {
      try {
        // Dynamically load AWS SDK to avoid crash if not installed
        const { S3Client } = await import('@aws-sdk/client-s3');
        this.s3Client = new S3Client({
          endpoint,
          region: this.configService.get<string>('S3_REGION') || 'us-east-1',
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: true, // Required for MinIO
        });
        this.useLocalFallback = false;
        this.logger.log('S3 storage client initialized successfully.');
      } catch (err) {
        this.logger.warn(`Failed to import @aws-sdk/client-s3. Falling back to local storage: ${err.message}`);
        this.initializeLocalStorage();
      }
    } else {
      this.logger.log('S3 configuration not found. Using local directory for storage.');
      this.initializeLocalStorage();
    }
  }

  private initializeLocalStorage() {
    this.useLocalFallback = true;
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }
    this.logger.log(`Local storage directory set to: ${this.localStorageDir}`);
  }

  async uploadFile(fileKey: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (this.useLocalFallback) {
      const filePath = path.join(this.localStorageDir, fileKey);
      const dirPath = path.dirname(filePath);
      
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(filePath, fileBuffer);
      this.logger.log(`Uploaded file locally: ${fileKey}`);
      
      const host = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
      return `${host}/uploads/${fileKey}`;
    }

    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      this.logger.log(`Uploaded file to S3: ${fileKey}`);

      const endpoint = this.configService.get<string>('S3_ENDPOINT');
      const cleanEndpoint = endpoint?.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
      return `${cleanEndpoint}/${this.bucketName}/${fileKey}`;
    } catch (err) {
      this.logger.error(`S3 Upload failed for key ${fileKey}: ${err.message}`);
      throw err;
    }
  }

  async getFile(fileKey: string): Promise<Buffer> {
    if (this.useLocalFallback) {
      const filePath = path.join(this.localStorageDir, fileKey);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileKey}`);
      }
      return fs.readFileSync(filePath);
    }

    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      
      // Convert stream to Buffer
      const streamToBuffer = (stream: any): Promise<Buffer> =>
        new Promise((resolve, reject) => {
          const chunks: any[] = [];
          stream.on('data', (chunk: any) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });

      return await streamToBuffer(response.Body);
    } catch (err) {
      this.logger.error(`S3 Retrieval failed for key ${fileKey}: ${err.message}`);
      throw err;
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    if (this.useLocalFallback) {
      const filePath = path.join(this.localStorageDir, fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted local file: ${fileKey}`);
      }
      return;
    }

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted S3 file: ${fileKey}`);
    } catch (err) {
      this.logger.error(`S3 Deletion failed for key ${fileKey}: ${err.message}`);
      throw err;
    }
  }
}
