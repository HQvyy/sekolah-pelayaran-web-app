import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// Password hashing memakai argon2id (praktik aman; bukan bcrypt/md5).
// Tidak ada password default/hardcoded di mana pun.
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
