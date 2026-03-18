import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, UserSafe } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

export interface AuthPayload {
  sub: string;
  role: string;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: UserSafe;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly invitesService: InvitesService,
  ) {}

  async register(dto: CreateUserDto): Promise<AuthResult> {
    if (dto.inviteToken != null && dto.role !== 'VENDOR') {
      throw new BadRequestException('Invite token is only valid for vendor registration');
    }

    const user = await this.usersService.createUser(dto);

    if (dto.inviteToken != null && dto.role === 'VENDOR') {
      await this.invitesService.markAsUsed(dto.inviteToken, user.id);
    }

    const payload = this.buildPayload(user);
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const userWithHash = await this.usersService.findByEmail(dto.email);

    if (!userWithHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordIsValid = await bcrypt.compare(dto.password, userWithHash.passwordHash);

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _, ...safeUser } = userWithHash;
    const payload = this.buildPayload(safeUser);
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: safeUser };
  }

  private buildPayload(user: UserSafe): AuthPayload {
    return {
      sub: user.id,
      role: user.role,
      email: user.email,
    };
  }
}

