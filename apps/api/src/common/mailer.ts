import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV, type Env } from '../config/env.js';

export type Mail = { to: string; subject: string; text: string };

/** Envia e-mail transacional. Nos testes é trocado por um falso que guarda as mensagens. */
export abstract class Mailer {
  abstract send(message: Mail): Promise<void>;

  /** Envia sem esperar: a resposta da rota não depende do provedor, e a falha não chega a quem pediu. */
  sendInBackground(message: Mail): void {
    void Promise.resolve()
      .then(() => this.send(message))
      .catch(() => undefined);
  }
}

/** Resend (https://resend.com). Sem RESEND_API_KEY nada é enviado. */
@Injectable()
export class ResendMailer extends Mailer {
  private readonly logger = new Logger('Mailer');

  constructor(@Inject(ENV) private readonly env: Env) {
    super();
  }

  async send(message: Mail): Promise<void> {
    if (!this.env.RESEND_API_KEY) {
      // Nunca registra o destinatário. O texto (com o código) só aparece em desenvolvimento sem chave,
      // quando nenhum e-mail sai de qualquer jeito.
      if (this.env.NODE_ENV === 'development') {
        this.logger.warn(
          `RESEND_API_KEY ausente: e-mail não enviado (desenvolvimento)\n${message.text}`,
        );
      } else {
        this.logger.warn('RESEND_API_KEY ausente: e-mail não enviado');
      }
      return;
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.env.MAIL_FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok)
        this.logger.error(`Falha ao enviar e-mail pelo Resend (HTTP ${response.status})`);
    } catch (error) {
      this.logger.error(
        `Falha de rede ao enviar e-mail: ${error instanceof Error ? error.name : 'desconhecido'}`,
      );
    }
  }
}
