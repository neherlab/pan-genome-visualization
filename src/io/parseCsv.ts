import Papa, { ParseResult, ParseWorkerConfig } from 'papaparse'

export function parseCsv<T>(content: string, delimiter: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(content, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      comments: '#',
      delimiter,
      worker: true,
      complete({ data, errors, meta }: ParseResult<T>) {
        if (errors.length > 0) {
          const { code, row, message } = errors[0]
          let err = `${code}: ${message}`
          if (row) {
            err = `row ${row}: ${err}`
          }
          const error = new Error(`CSV parser error: ${err}`)
          error.name = 'CsvParserError'
          return reject(error)
        }
        if (meta.aborted) {
          return reject(new Error('CSV parsing error: aborted'))
        }
        if (!data?.length) {
          return reject(new Error('CSV parsing error: There was no data to parse'))
        }
        return resolve(data)
      },
    } as ParseWorkerConfig<T>)
  })
}
