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

      console.log();

      // Create regex for directory name
      const dRegex = /tamk-java-\w+-\w+/
      // Search for the file name from the file path
      const dName = dir.match(dRegex)[0]
      console.log(`dName: ${dName}`)

      // Create a folder and path variable for reports
      const reports = path.join(__dirname, 'Documents', 'drive', dName)
      execSync('mkdir reports', { cwd: reports})
      const rPath = path.join(reports, 'report.txt')
      console.log(`rPath: ${rPath}`)

      try {
        console.log('Creating report file...')
        // Create new report text file
        fs.writeFileSync(rPath, 'REPORT\n')
      } catch (error) {
        console.log('There was an issue with creating report.txt')
        console.log(error)
      }

      try {
        // Find all java files under current directory and add them to text file
        execSync('find -name *.java > files.txt', { cwd: dir })
      } catch (error) {
        console.log('Error in finding Java files and creating output file')
        return
      }

      let fData = ''

      // Put the file list into a string variable
      fData = fs.readFileSync(`${dir}/files.txt`, 'utf8')
      const files = fData.split('\n')
      // TODO: Sort files --> e01, e02...
      files.pop()

      files.forEach((file) => {
        console.log('--- Files ---')
        console.log(`dir: ${dir}`)
        console.log(`file: ${file}`)

        // Create regex for file name
        const fRegex = /e\d{2}/
        // Search for the file name from the file path
        const fName = file.match(fRegex)[0]
        console.log(`fName: ${fName}`)

        try {
          console.log('--- javac ---')
          console.log('compiling...')
          // Create a path object for the file
          const fPath = path.join(dir, 'exercises', fName)
          console.log(`fPath: ${fPath}`)
          // Compile the current file
          execSync(`javac ${fName}.java`, { cwd: fPath })
          console.log('compiled...')
        } catch (error) {
          console.log(rPath)
          fs.appendFileSync(rPath, `${fName}: ${error}\n`, 'utf8')
          return
        }

        // TODO: add reporting for Scanner exercises

        let output = ''

        try {
          console.log('--- java ---')
          console.log('running...')
          output = execSync(`java ${fName}`, {
            cwd: `${dir}/exercises/${fName}`,
          })
            .toString()
            .trim()
        } catch (error) {
          fs.appendFileSync(rPath, `${fName}: ${error}\n`, 'utf8')
          return
        }

        check(fName, output, dName)
      })
    })
    console.timeEnd('ex-checker')
  })
} catch (error) {
  console.log('There was an error in scheduling...')
  console.log(error)
}

const check = (exercise, answer, dName) => {
  console.log('checking...')

  const reports = path.join(__dirname, 'Documents', 'drive', dName, 'reports')
  const rPath = path.join(reports, 'report.txt')
  console.log(`rPath: ${rPath}`)

  console.log('reporting...')
  switch (exercise) {
    case 'e01':
      if (answer === 'Hello World') {
        fs.appendFileSync(rPath, `e01: OK\n`)
      } else {
        fs.appendFileSync(rPath, `e01: WRONG\n`)
      }
      break
    case 'e02':
      if (answer === '4') {
        fs.appendFileSync(rPath, `e02: OK\n`)
      } else {
        fs.appendFileSync(rPath, `e02: WRONG\n`)
      }
      break
    // TODO: Add model answers and reporting
    default:
      break
  }
  console.log()
}
