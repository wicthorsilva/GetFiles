const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');


// Função para mover arquivos Excel (.xlsx, .xls)
async function moveExcelFiles(srcFolder, destFolder) {
  const files = await fs.readdir(srcFolder);

  for (const file of files) {
    const fullPath = path.join(srcFolder, file);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      // Recursivamente entrar na subpasta
      await moveExcelFiles(fullPath, destFolder);
    } else if (path.extname(file).toLowerCase() === '.xlsx' || path.extname(file).toLowerCase() === '.xls') {
      // Mover arquivos Excel
      const destPath = path.join(destFolder, file);
      console.log(`Movendo: ${fullPath} para ${destPath}`);
      await fs.move(fullPath, destPath, { overwrite: true });
    }
  }
}

// Função principal do programa
async function main() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'source',
      message: 'Digite o caminho da pasta que deseja selecionar:',
    },
    {
      type: 'input',
      name: 'destination',
      message: 'Digite o caminho da pasta de destino para os arquivos Excel:',
    },
  ]);

  const sourceFolder = path.resolve(answers.source);
  const destinationFolder = path.resolve(answers.destination);

  if (!await fs.pathExists(sourceFolder)) {
    console.error('A pasta selecionada não existe!');
    return;
  }

  if (!await fs.pathExists(destinationFolder)) {
    console.error('A pasta de destino não existe!');
    return;
  }

  console.log('Movendo arquivos...');
  await moveExcelFiles(sourceFolder, destinationFolder);
  console.log('Arquivos movidos com sucesso!');
}

main().catch(err => console.error(err));
