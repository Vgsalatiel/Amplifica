/**
 * Cria (ou promove) o primeiro administrador. Uso:
 *
 *   ADMIN_EMAIL=... ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run seed:admin
 *
 * As três variáveis precisam estar na mesma linha do comando (ou exportadas). Elas também
 * podem ficar no .env, mas a senha fica melhor fora de arquivos e do histórico do terminal. Rodar de novo não duplica nada:
 * se a conta já existe, só garante o papel ADMIN, sem trocar a senha.
 */
import { NestFactory } from '@nestjs/core';
import { PasswordHasher } from '@nestjs/authentication';
import { AppModule } from '../app.module.js';
import { registerSchema } from '../modules/auth/auth.schemas.js';
import { PrismaService } from '../prisma/prisma.service.js';

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});

try {
  const input = registerSchema.safeParse({
    email: process.env['ADMIN_EMAIL'],
    username: process.env['ADMIN_USERNAME'],
    password: process.env['ADMIN_PASSWORD'],
  });
  if (!input.success) {
    const names = {
      email: 'ADMIN_EMAIL',
      username: 'ADMIN_USERNAME',
      password: 'ADMIN_PASSWORD',
    } as const;
    const problems = input.error.issues
      .map((issue) => {
        const name = names[issue.path[0] as keyof typeof names];
        // Variável ausente: a mensagem do esquema fala de tipos, não ajuda quem está digitando.
        return `- ${name}: ${process.env[name] ? issue.message : 'não está definida'}`;
      })
      .join('\n');
    throw new Error(
      `Não foi possível criar o administrador.\n${problems}\n\n` +
        'Passe as três variáveis na mesma linha do comando (ou use `export`): linhas soltas ' +
        'como `ADMIN_EMAIL=...` valem só para o shell e o npm não as enxerga.\n' +
        'O nome de usuário aceita apenas letras minúsculas, números, ponto e sublinhado.',
    );
  }

  const prisma = app.get(PrismaService);
  const { email, username, password } = input.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
    console.log(
      `A conta ${email} já existia e agora é ADMIN. A senha não foi alterada.`,
    );
  } else {
    await prisma.user.create({
      data: {
        email,
        username,
        displayName: username,
        role: 'ADMIN',
        passwordHash: await app.get(PasswordHasher).hash(password),
      },
    });
    console.log(`Administrador ${email} criado.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
