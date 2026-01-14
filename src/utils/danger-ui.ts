import pc from 'picocolors';

export const renderDangerBanner = (
  message: string,
  label: string = 'DANGER',
): string[] => {
  const labelText = ` ${label} `;
  const spacer = ' ';
  const contentLength = labelText.length + spacer.length + message.length;
  const innerWidth = contentLength + 2;
  const border = '─'.repeat(innerWidth);

  const top = pc.red(`  ┌${border}┐`);
  const middle =
    `  ${pc.red('│ ')}` +
    pc.bgRed(pc.white(labelText)) +
    pc.red(`${spacer}${message}`) +
    pc.red(' │');
  const bottom = pc.red(`  └${border}┘`);

  return [top, middle, bottom];
};
