'use strict';
import path from 'path'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import fs from 'fs'

import yargs from 'yargs'
import chalk from 'chalk'

const optionsYargs = yargs(process.argv.slice(2))
  .usage('Uso: $0 [options]')
  .option("f", { alias: "from", describe: "posição inicial de pesquisa da linha do Cnab", type: "number", demandOption: true })
  .option("t", { alias: "to", describe: "posição final de pesquisa da linha do Cnab", type: "number", demandOption: true })
  .option("s", { alias: "segmento", describe: "tipo de segmento", type: "string" })
  .option("n", { alias: "companyName", describe: "nome da empresa de pesquisa da linha do Cnab", type: "string" })
  .option("a", { alias: "archive", describe: "caminho do arquivo Cnab", type: "string", demandOption: true })
  .check(argv => {
    if (!argv.companyName && !argv.segmento) {
      throw new Error('A opção "segmento" é obrigatória se "companyName" não for fornecido.');
    }
    return true;
  })
  .example('$0 -f 21 -t 34 -s p -n "NomeEmpresa" -a ./caminho/do/seu/arquivo.cnab', 'lista a linha e campo que from e to do cnab')
  .argv;

const { from, to, segmento, companyName, archive } = optionsYargs

const filePath = path.isAbsolute(archive) ? archive : path.resolve(fileURLToPath(import.meta.url), archive)

const sliceArrayPosition = (arr, ...positions) => [...arr].slice(...positions)

const messageLog = (segmento, segmentoType, from, to) => `
----- Cnab linha ${segmentoType} -----

posição from: ${chalk.inverse.bgBlack(from)}

posição to: ${chalk.inverse.bgBlack(to)}

item isolado: ${chalk.inverse.bgBlack(segmento.substring(from - 1, to))}

item dentro da linha ${segmentoType.toUpperCase()}: 
  ${segmento.substring(0, from)}${chalk.inverse.bgBlack(segmento.substring(from - 1, to))}${segmento.substring(to)}

----- FIM ------
`

const log = console.log

console.time('leitura Async')

readFile(filePath, 'utf8')
  .then(file => {
    const cnabArray = file.split('\n')

    // const cnabHeader = sliceArrayPosition(cnabArray, 0, 2)

    const cnabBodySegmentos = sliceArrayPosition(cnabArray, 2, -2)
    const [cnabBodySegmentoP, cnabBodySegmentoQ, cnabBodySegmentoR] = cnabBodySegmentos

    // const cnabTail = sliceArrayPosition(cnabArray, -2)

    if (companyName) {
      const companyNameStart = 33;
      const companyNameEnd = 72;
      const companyAddressStart = 72;
      const companyAddressEnd = 127;

      const companyNameRegex = new RegExp(companyName, 'i');
      const companies = [];

      cnabBodySegmentos.forEach((segmento) => {
        const match = segmento.match(companyNameRegex);

        if (match) {
          const matchStartPosition = match.index + 1;
          const matchEndPosition = matchStartPosition + match[0].length - 1;

          const segmentoInitialCode = segmento.split(' ')[0];
          const segmentoType = segmentoInitialCode[segmentoInitialCode.length - 1];

          log(messageLog(segmento, segmentoType, matchStartPosition, matchEndPosition));

          const companyName = segmento.substring(companyNameStart, companyNameEnd).trim().replace(/\s+/g, ' ');
          const companyAddress = segmento.substring(companyAddressStart, companyAddressEnd).trim().replace(/\s+/g, ' ');

          companies.push({ name: companyName, address: companyAddress });

          const jsonCompanies = JSON.stringify(companies, null, 2);

          const jsonFilePath = path.join(new URL('.', import.meta.url).pathname, 'companies.json');

          fs.writeFileSync(jsonFilePath, jsonCompanies, 'utf-8');
        }
      });
    } else {
      if (segmento === 'p') {
        log(messageLog(cnabBodySegmentoP, 'P', from, to))
        return
      }
  
      if (segmento === 'q') {
        log(messageLog(cnabBodySegmentoQ, 'Q', from, to))
        return
      }
  
      if (segmento === 'r') {
        log(messageLog(cnabBodySegmentoR, 'R', from, to))
        return
      }
    }
  })
  .catch(error => {
    console.log("🚀 ~ file: cnabRows.js ~ line 76 ~ error", error)
  })
console.timeEnd('leitura Async')
