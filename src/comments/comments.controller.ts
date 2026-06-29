import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserWithoutPassword } from '../common/types/user.types';

interface RequestWithUser extends Request {
  user: UserWithoutPassword;
}

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createComment(
    @Request() req: RequestWithUser,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(createCommentDto, req.user.id);
  }

  @Get('ticket/:ticketId')
  getCommentsByTicket(@Param('ticketId') ticketId: string) {
    return this.commentsService.getCommentsByTicket(ticketId);
  }

  @Get(':id')
  getCommentById(@Param('id') id: string) {
    return this.commentsService.getCommentById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateComment(@Param('id') id: string, @Body() body: { body: string }) {
    return this.commentsService.updateComment(id, body.body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteComment(@Param('id') id: string) {
    return this.commentsService.deleteComment(id);
  }
}
