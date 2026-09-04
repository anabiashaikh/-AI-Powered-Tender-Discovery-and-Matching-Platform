import { Page, Browser } from 'playwright';

export interface TenderData {
  title: string;
  description: string;
  organization: string;
  country: string;
  province_region?: string;
  category: string;
  deadline: Date | null;
  published_date: Date | null;
  tender_number: string;
  source_url: string;
  procurement_type: string;
  status: string;
}

export interface ScrapingResult {
  success: boolean;
  tenders: TenderData[];
  errors: string[];
  metadata: {
    totalScanned: number;
    totalPages?: number;
    scrapedAt: Date;
  };
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  region: 'canada' | 'worldwide';
  rateLimitMs: number;
  maxRetries: number;
  timeoutMs: number;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected browser: Browser | null = null;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  abstract scrape(page: Page): Promise<ScrapingResult>;

  protected async initBrowser(): Promise<Browser> {
    const { chromium } = await import('playwright');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return this.browser;
  }

  protected async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.initBrowser();
    }
    return await this.browser!.newPage();
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateHash(tender: TenderData): string {
    const crypto = require('crypto');
    const data = `${tender.title}|${tender.tender_number}|${tender.organization}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  protected parseDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch {
      return null;
    }

    // Try common date formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/,
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          const [, part1, part2, part3] = match;
          // Try different arrangements
          const arrangements = [
            new Date(`${part1}-${part2}-${part3}`),
            new Date(`${part3}-${part2}-${part1}`),
            new Date(`${part2}-${part1}-${part3}`),
          ];
          
          for (const date of arrangements) {
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  protected cleanText(text: string | null | undefined | unknown): string {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') return String(text);
    return text.replace(/\s+/g, ' ').trim();
  }

  protected extractUrl(href: string | null, baseUrl: string): string {
    if (!href) return baseUrl;
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) {
      const url = new URL(baseUrl);
      return `${url.origin}${href}`;
    }
    return `${baseUrl}/${href}`;
  }
}
