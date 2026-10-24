import { Injectable, Logger } from '@nestjs/common';

/**
 * Sends plain-text email through Resend's HTTP API (no SDK needed).
 * Without RESEND_API_KEY, development prints the message to the console so
 * links can be followed locally; production only logs that it could not send.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(to: string, subject: string, text: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          `RESEND_API_KEY is not set; "${subject}" was not sent`,
        );
      } else {
        this.logger.log(`[dev email] to ${to}: ${subject}\n${text}`);
      }
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'SkillSwap <onboarding@resend.dev>',
          to,
          subject,
          text,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.error(
          `Email "${subject}" failed: ${response.status} ${await response.text()}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Email "${subject}" failed: ${(error as Error).message}`,
      );
    }
  }
}
