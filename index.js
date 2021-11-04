const schedule = require('node-schedule')
const { exec, execSync } = require('child_process')
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
          !rData.includes(`${fName}: OK`) ||
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

          // TODO: Add Scanner exercise reporting here

          // Run the current file
          const output = run(fName, fPath)
        } catch (error) {
          // If ex was wrong, replace eXX: WRONG with error message
          if (rData.includes(`${fName}: WRONG`)) {
            const regex = `${fName}: WRONG`
            const re = RegExp(regex, 'g')
            const result = rData.replace(re, `${fName}: ERROR\n${error}\n`)

            try {
              fs.writeFileSync(rPath, result)
            } catch (error) {
              console.log('There was an error with writing to report.txt')
              console.log(error)
            }

            return
          }

          // If ex was erroneous, replace eXX: ERROR... with new error in data
          if (rData.includes(`${fName}: ERROR`)) {
            const regex = `${fName}.+\\n(.+\\n)*(?=e\\d\\d:)`
            const re = RegExp(regex, 'g')
            const result = rData.replace(re, `${fName}: ERROR\n${error}\n`)

            try {
              fs.writeFileSync(rPath, result)
            } catch (error) {
              console.log('There was an error with writing to report.txt')
              console.log(error)
            }

            return
          }

          // Otherwise add error message to ex
          fs.appendFileSync(rPath, `${fName}: ERROR\n${error}\n`, 'utf8')
          return
        }

        // COMPARE ANSWER TO MODEL ANSWER
        check(fName, output, dName)
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

const run = (fName, fPath) => {
  console.log('--- java ---')
  console.log('running...')
  const output = execSync(`java ${fName}`, { cwd: fPath }).toString().slice(0, -1)
  console.log('file was run...')
  return output
}

// TODO: Add model answers and create new and replaced reports
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
  if (rData.includes(`${fName}`)) {
    // Don't do anything if the exercise was previously wrong
    if (!correct && rData.includes(`${fName}: WRONG`)) return

    const regex = `${fName}: ([A-Z]+( )?)+\\n?((.+\\n)*?(?=(e\\d\\d)|\\Z))`
    const re = RegExp(regex, 'g')
    const exResult = correct ? 'OK' : 'WRONG'
    const result = rData.replace(re, `${fName}: ${exResult}\n`)

    try {
      fs.writeFileSync(rPath, result)
    } catch (error) {
      console.log('There was an error with writing to report.txt')
      console.log(error)
    }

    return
  }

  // If not, add it to file WRONG
  try {
    fs.appendFileSync(rPath, `${exercise}: WRONG\n`)
  } catch (error) {
    console.log("There was an error with writing to report.txt");
    console.log(error);
  }

  console.log()
}

// TODO: Create function for sorting report.txt
