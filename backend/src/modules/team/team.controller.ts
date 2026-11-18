import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CatalogPolicy } from '../catalog/catalog.policy.js';
import {
  setRoleSchema,
  usernameParamSchema,
  type SetRoleDto,
} from './team.schemas.js';
import { TeamService, type TeamMember } from './team.service.js';

/** Equipe do site. Só administradores (a mesma regra que protege o catálogo). */
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Can(CatalogPolicy, 'manage')
  @Get()
  list(): Promise<TeamMember[]> {
    return this.team.list();
  }

  @Can(CatalogPolicy, 'manage')
  @Put(':username')
  setRole(
    @Param('username', { schema: usernameParamSchema }) username: string,
    @Body({ schema: setRoleSchema }) body: SetRoleDto,
  ): Promise<TeamMember> {
    return this.team.setRole(username, body);
  }
}
