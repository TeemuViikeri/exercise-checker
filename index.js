const schedule = require('node-schedule')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

try {
  console.log('Scheduling...')
  // Schedule function call every 10 seconds
  schedule.scheduleJob('6 * * * *', () => {
    console.time('ex-checker')
    // Find all directiories that start with tamk-java-* and put the output into text file
    execSync('find . -name tamk-java-* > dirs.txt')

    // Put the directory list into a string variable
    const dData = fs.readFileSync('dirs.txt', 'utf8')
    const dirs = dData.split('\n')
    dirs.pop()

    console.log(dirs)

    dirs.forEach((dir) => {
      console.log('--- Directories ---')
      console.log(`dir: ${dir}`)

      console.log()

      // Create regex for directory name
      const dRegex = /tamk-java-\w+-\w+/
      // Search for the file name from the file path
      const dName = dir.match(dRegex)[0]
      console.log(`dName: ${dName}`)

      const reports = path.join(__dirname, 'Documents', 'drive', dName)

      // Check if reports folder exists, if not, create it
      if (!fs.existsSync(path.join(reports, 'reports'))) {
        execSync('mkdir reports', { cwd: reports })
      }

      // Create path variable for a report file
      const rPath = path.join(reports, 'reports', 'report.txt')
      console.log(`rPath: ${rPath}`)

      // Create new report text file if it doesn't exist yet
      if (!fs.existsSync(rPath)) {
        try {
          console.log('Creating report file...')
          fs.writeFileSync(rPath, 'REPORT\n')
        } catch (error) {
          console.log(
            'There was an issue with creating report.txt or it already exists'
          )
          console.log(error)
        }
      }

      try {
        // Find all java files under current directory and add them to text file
        execSync('find -name *.java > files.txt', { cwd: dir })
      } catch (error) {
        console.log('Error in finding Java files and creating output file')
        return
      }

      let fData = ''

      // Put the exercises file list into a string variable
      fData = fs.readFileSync(`${dir}/files.txt`, 'utf8')
      // Split the exercises into string array
      const fSplit = fData.split('\n').pop()
      // Sort array by exercise number in ascending order
      const files = fSplit.sort((a, b) => {
        const aInt = parseInt(a)
        const bInt = parseInt(b)

        if (aInt < bInt) return -1
        if (aInt > bInt) return 1
        return 0
      })

      files.forEach((file) => {
        console.log('--- Files ---')
        console.log(`dir: ${dir}`)
        console.log(`file: ${file}`)

        // Create regex for file name
        const fRegex = /e\d{2}/
        // Search for the file name from the file path
        const fName = file.match(fRegex)[0]
        console.log(`fName: ${fName}`)

        // Read report data from reports.txt
        const rData = fs.readFileSync(rPath, 'utf8')

        // Skip this file checking if ex is OK or in manual checking
        if (
          rData.includes(`${fName}: OK`) ||
          rData.includes(`${fName}: IN MANUAL CHECK`)
        ) {
          return
        }

        // Create a path object for the file
        const fPath = path.join(dir, 'exercises', fName)
        console.log(`fPath: ${fPath}`)

        // Initialize output variable
        let output = ''

        try {
          // Compile the current file
          compile(fName, fPath)

          // Check if exercise is reviewable or not
          const isStandard = checkIfStandard(fName)

          // If not, add to report the exercise goes to manual check
          if (!isStandard) {
            const text = 'IN MANUAL CHECK'
            // If there is a report for the current file, replace it with "IN MANUAL CHECK"
            if (rData.includes(`${fName}`)) {
              replace(rData, rPath, fName, text)
              return
            }

            // If not, append the "IN MANUAL CHECK" to report.txt
            append(rPath, fName, text)
            return
          }

          // Run the current file
          output = run(fName, fPath)
        } catch (error) {
          const text = `ERROR\n${error}}\n`

          // If ex has already been reported, replace it with error message
          if (rData.includes(`${fName}`)) {
            replace(rData, rPath, fName, text)
            return
          }

          // Otherwise add error message to ex
          append(rPath, fName, text)
          return
        }

        // COMPARE ANSWER TO MODEL ANSWER
        check(fName, output, dName)
        sortReport(rData, rPath)
      })
      execSync('rm files.txt', { cwd: dir })
    })
    execSync('rm dirs.txt')
    console.timeEnd('ex-checker')
  })
} catch (error) {
  console.log('There was an error in scheduling...')
  console.log(error)
}

const compile = (fName, fPath) => {
  console.log('--- javac ---')
  console.log('compiling...')
  execSync(`javac ${fName}.java`, { cwd: fPath })
  console.log('file was compiled...')
}

const checkIfStandard = (fName) => {
  // Don't continue if exercise is not reviewable
  switch (fName) {
    case 'e03':
    case 'e04':
    case 'e05':
    case 'e06':
    case 'e07':
    case 'e10':
    case 'e21':
    case 'e27':
    case 'e30':
      return false
    default:
      return true
  }
}

const run = (fName, fPath) => {
  console.log('--- java ---')
  console.log('running...')
  const output = execSync(`java ${fName}`, { cwd: fPath })
    .toString()
    .slice(0, -1)
  console.log('file was run...')
  return output
}

const replace = (rData, rPath, fName, message) => {
  if (rData.includes(`${fName}`)) {
    const regex = `${fName}: ([A-Z]+( )?)+\\n?((.+\\n)*?(?=(e\\d\\d)|\\Z))`
    const re = RegExp(regex, 'g')
    const result = rData.replace(re, `${fName}: ${message}\n`)

    try {
      fs.writeFileSync(rPath, result)
    } catch (error) {
      console.log('There was an error with writing to report.txt')
      console.log(error)
    }
  }
}

const append = (rPath, fName, message) => {
  fs.appendFileSync(rPath, `${fName}: ${message}\n`, 'utf8')
}

const check = (exercise, answer, dName) => {
  console.log('checking...')

  const reports = path.join(__dirname, 'Documents', 'drive', dName, 'reports')
  const rPath = path.join(reports, 'report.txt')
  const rData = fs.readFileSync(rPath, 'utf8')

  const aPath = path.join(__dirname, 'answers.txt')
  const aData = fs.readFileSync(aPath, 'utf8')

  // e03: \n(.+\n)*(?=(e\d\d)|(\Z))
  const re = `(?<=${file}: \\n)(((.+\\n?)*?)(?=(e\\d\\d: \\n)|\\Z))`
  const regex = RegExp(re, 'gm')
  const model = aData.match(regex)

  console.log('reporting...')

  const correct = false

  if (answer === model) correct = true

  // If ex was already in report.txt, replace it with answer comparison result
  if (rData.includes(`${exercise}`)) {
    // Don't do anything if the exercise was previously wrong
    if (!correct && rData.includes(`${exercise}: WRONG`)) return
    const exResult = correct ? 'OK' : 'WRONG'

    replace(rData, rPath, exercise, exResult)
    return
  }

  // If not, add it to file WRONG
  try {
    append(rPath, exercise, `${exercise}: WRONG\n`)
  } catch (error) {
    console.log('There was an error with writing to report.txt')
    console.log(error)
  }

  console.log()
}

const sortReport = (rData, rPath) => {
  const regex = RegExp("\\n(?=e\\d\\d)")
  const reports = rData.split(regex)

  const sortedData = reports.sort((a, b) => {
    const aEx = a.match(RegExp(/(?<=e)\d\d/))[0]
    const bEx = b.match(RegExp(/(?<=e)\d\d/))[0]
    const aInt = parseInt(aEx)
    const bInt = parseInt(bEx)

    if (aInt < bInt) return -1
    if (aInt > bInt) return 1
    return 0
  }).join("\n")

  try {
    fs.writeFileSync(rPath, sortedData)
  } catch (error) {
    console.log('There was an error with writing to report.txt')
    console.log(error)
  }
}
