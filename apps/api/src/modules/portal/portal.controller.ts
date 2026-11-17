import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type PublicShop,
  type Slots,
  slotsQuerySchema,
  tutorBookingSchema,
  tutorCodeRequestSchema,
  tutorCodeVerifySchema,
  type TutorMe,
  tutorPetSchema,
  tutorProfileSchema,
  type TutorSession,
} from '@petsystem/contracts';
import type { z } from 'zod';

import { Public } from '../../common/public.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { AvailabilityService } from './availability.service.js';
import { CurrentTutor, TutorGuard } from './tutor.guard.js';
import { TutorService } from './tutor.service.js';
import { TutorAuthService,type TutorClaims } from './tutor-auth.service.js';

/** Limite das rotas de código: o mesmo das rotas de login da loja (variável de ambiente). */
const codeLimit = {
  default: { limit: () => Number(process.env.THROTTLE_AUTH_LIMIT ?? 10), ttl: 60_000 },
};

const slugParam = (slug: string): string => slug.slice(0, 40).toLowerCase();

@Public()
@Controller('public/shops/:slug')
export class PublicShopController {
  constructor(
    @Inject(AvailabilityService) private readonly availability: AvailabilityService,
    @Inject(TutorAuthService) private readonly auth: TutorAuthService,
  ) {}

  @Get()
  async shop(@Param('slug') slug: string): Promise<PublicShop> {
    return this.availability.publicShop(await this.availability.shopBySlug(slugParam(slug)));
  }

  @Get('slots')
  async slots(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(slotsQuerySchema)) q: z.infer<typeof slotsQuerySchema>,
  ): Promise<Slots> {
    const shop = await this.availability.shopBySlug(slugParam(slug));
    const service = await this.availability.onlineService(shop.id, q.serviceId);
    return { day: q.day, slots: await this.availability.slots(shop, service, q.day) };
  }

  @Post('code')
  @HttpCode(202)
  @Throttle(codeLimit)
  async requestCode(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(tutorCodeRequestSchema))
    body: z.infer<typeof tutorCodeRequestSchema>,
  ): Promise<{ ok: true }> {
    await this.auth.requestCode(slugParam(slug), body.email);
    return { ok: true };
  }

  @Post('verify')
  @HttpCode(200)
  @Throttle(codeLimit)
  verify(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(tutorCodeVerifySchema)) body: z.infer<typeof tutorCodeVerifySchema>,
  ): Promise<TutorSession> {
    return this.auth.verify(slugParam(slug), body.email, body.code);
  }

  @Post('demo')
  @HttpCode(200)
  demo(@Param('slug') slug: string): Promise<TutorSession> {
    return this.auth.demoLogin(slugParam(slug));
  }
}

@Public()
@UseGuards(TutorGuard)
@Controller('tutor')
export class TutorController {
  constructor(@Inject(TutorService) private readonly tutor: TutorService) {}

  @Get('me')
  me(@CurrentTutor() t: TutorClaims): Promise<TutorMe> {
    return this.tutor.me(t);
  }

  @Post('profile')
  @HttpCode(200)
  profile(
    @CurrentTutor() t: TutorClaims,
    @Body(new ZodValidationPipe(tutorProfileSchema)) body: z.infer<typeof tutorProfileSchema>,
  ): Promise<TutorSession> {
    return this.tutor.createProfile(t, body);
  }

  @Post('pets')
  addPet(
    @CurrentTutor() t: TutorClaims,
    @Body(new ZodValidationPipe(tutorPetSchema)) body: z.infer<typeof tutorPetSchema>,
  ): Promise<TutorMe> {
    return this.tutor.addPet(t, body);
  }

  @Post('appointments')
  book(
    @CurrentTutor() t: TutorClaims,
    @Body(new ZodValidationPipe(tutorBookingSchema)) body: z.infer<typeof tutorBookingSchema>,
  ): Promise<TutorMe> {
    return this.tutor.book(t, body);
  }

  @Post('appointments/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentTutor() t: TutorClaims, @Param('id', ParseUUIDPipe) id: string): Promise<TutorMe> {
    return this.tutor.cancel(t, id);
  }
}
