import sharp from 'sharp';

/** Capa de teste: fundo cinza-claro com um "sol" vermelho, como a capa de exemplo do projeto. */
export function coverPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 185, g: 193, b: 196 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 200,
            height: 200,
            channels: 3,
            background: { r: 215, g: 38, b: 27 },
          },
        },
        left: 300,
        top: 100,
      },
    ])
    .png()
    .toBuffer();
}

/** Imagem sem nenhuma cor marcante: só tons de cinza. */
export function grayPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 300,
      height: 300,
      channels: 3,
      background: { r: 120, g: 120, b: 120 },
    },
  })
    .png()
    .toBuffer();
}
