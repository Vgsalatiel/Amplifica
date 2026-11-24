-- Tentativas de digitar o código de redefinição de senha: limita o chute.
ALTER TABLE "EmailToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
