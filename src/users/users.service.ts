import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<any> {
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await argon2.hash(createUserDto.password);

    const user = await this.usersRepository.create({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      name: createUserDto.name,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findById(id: string): Promise<any> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string): Promise<any> {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.usersRepository.update(id, updateUserDto);

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async markEmailAsVerified(id: string): Promise<any> {
    const user = await this.usersRepository.markEmailAsVerified(id);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(): Promise<any[]> {
    const users = await this.usersRepository.findAll();
    return users.map((user) => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());

    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
