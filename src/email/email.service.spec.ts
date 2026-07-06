import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockSendMail = jest.fn().mockResolvedValue({});
const mockTransporter = { sendMail: mockSendMail };

(nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

const mockConfig = {
  get: jest.fn((key: string) => {
    const values: Record<string, string | number> = {
      'smtp.host': 'smtp.example.com',
      'smtp.port': 587,
      'smtp.user': 'user',
      'smtp.password': 'pass',
      'smtp.from': 'noreply@example.com',
    };
    return values[key];
  }),
  getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({});
    mockConfig.getOrThrow.mockReturnValue('http://localhost:3000');
    mockConfig.get.mockImplementation((key: string) => {
      const values: Record<string, string | number> = {
        'smtp.from': 'noreply@example.com',
      };
      return values[key];
    });
  });

  describe('sendVerificationEmail', () => {
    it('sends email with verification link containing token', async () => {
      await service.sendVerificationEmail('user@example.com', 'abc123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.any(String),
          html: expect.stringContaining('abc123'),
        }),
      );
    });

    it('includes frontendUrl in the verification link', async () => {
      mockConfig.getOrThrow.mockReturnValue('http://myapp.com');
      await service.sendVerificationEmail('user@example.com', 'tok123');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('http://myapp.com'),
        }),
      );
    });
  });
});
