import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtService,
    // Guard global: semua endpoint butuh Bearer valid kecuali @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, PasswordService, TokenService],
})
export class AuthModule {}
