import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { type Note, noteInputSchema, noteUpdateSchema } from '@petsystem/contracts';
import type { z } from 'zod';

import { defined } from '../../common/defined.js';
import type { Principal } from '../../common/jwt-auth.guard.js';
import { notFound } from '../../common/not-found.js';
import { CurrentPrincipal } from '../../common/principal.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const toNote = (n: { id: string; text: string; done: boolean; createdAt: Date }): Note => ({
  ...n,
  createdAt: n.createdAt.toISOString(),
});

/** Avisos do painel (lembretes rápidos da equipe). Máximo de 50 por loja. */
@Injectable()
export class NotesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(shopId: string): Promise<Note[]> {
    const rows = await this.prisma.note.findMany({
      where: { shopId },
      orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return rows.map(toNote);
  }

  async create(shopId: string, input: z.infer<typeof noteInputSchema>): Promise<Note> {
    const count = await this.prisma.note.count({ where: { shopId } });
    if (count >= 50) {
      // Apaga o aviso concluído mais antigo para abrir espaço; sem concluídos, mantém o limite.
      const oldest = await this.prisma.note.findFirst({
        where: { shopId, done: true },
        orderBy: { createdAt: 'asc' },
      });
      if (oldest) await this.prisma.note.delete({ where: { id: oldest.id } });
    }
    return toNote(await this.prisma.note.create({ data: { ...input, shopId } }));
  }

  async update(shopId: string, id: string, input: z.infer<typeof noteUpdateSchema>): Promise<Note> {
    const { count } = await this.prisma.note.updateMany({
      where: { id, shopId },
      data: defined(input),
    });
    if (count !== 1) throw notFound('Aviso');
    return toNote(await this.prisma.note.findUniqueOrThrow({ where: { id } }));
  }

  async remove(shopId: string, id: string): Promise<void> {
    const { count } = await this.prisma.note.deleteMany({ where: { id, shopId } });
    if (count !== 1) throw notFound('Aviso');
  }
}

@Controller('notes')
export class NotesController {
  constructor(@Inject(NotesService) private readonly notes: NotesService) {}

  @Get()
  list(@CurrentPrincipal() p: Principal): Promise<Note[]> {
    return this.notes.list(p.shopId);
  }

  @Post()
  create(
    @CurrentPrincipal() p: Principal,
    @Body(new ZodValidationPipe(noteInputSchema)) body: z.infer<typeof noteInputSchema>,
  ): Promise<Note> {
    return this.notes.create(p.shopId, body);
  }

  @Patch(':id')
  update(
    @CurrentPrincipal() p: Principal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(noteUpdateSchema)) body: z.infer<typeof noteUpdateSchema>,
  ): Promise<Note> {
    return this.notes.update(p.shopId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentPrincipal() p: Principal, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.notes.remove(p.shopId, id);
  }
}

@Module({ controllers: [NotesController], providers: [NotesService] })
export class NotesModule {}
