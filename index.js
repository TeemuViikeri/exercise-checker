const schedule = require('node-schedule')
const { exec, execSync } = require('child_process')
const fs = require('fs');
const { stdout, stderr } = require('process');

try {
	console.log("Scheduling...");
	schedule.scheduleJob('*/10 * * * * *', () => {
		console.log("Checking...");

		execSync('find . -name tamk-java-* > dirs.txt')
		const dData = fs.readFileSync('dirs.txt', 'utf8')
		const dirs = dData.split("\n")
		dirs.pop()
		console.log(dirs);

		dirs.forEach((dir) => {
			try {
				execSync('rm ./reports/report.txt', { cwd: dir})
			} catch (error) {
				console.log("report.txt not found");	
			}

			exec('find -name *.java > files.txt', { cwd: dir }, (error, stdout, stderr) => {
				if (error) {
					console.log("Error in finding Java files and creating output file");
					return
				}

				const fData = fs.readFileSync(`${dir}/files.txt`, 'utf8')
				console.log(fData);
				const files = fData.split("\n")
				files.pop()
				
				files.forEach((file) => {
					execSync(`pwd | javac ${file}`, { cwd: dir }, (error, stdout, stderr) => {
						const fName = file.substring(file.lastIndexOf("/"), 3)
						console.log(fName);
						fs.appendFileSync('./reports/report.txt',`${fName}: ${error}`, 'utf8')

						// if (error) {
						// 	console.log(`Error in compiling file ${fName}`);
						// 	return
						// }
					})
				})
			})
  
			// exec(`javac `, (error, stdout, stderr) => {
			// 	execSync('touch ./reports/report.txt')

			// 	if (error) {
			// 		console.error(`javac exec error: ${error}`);
			// 		fs.appendFileSync('E01: \n')
			// 	}
			// })
		})
 
		// exec('javac *.java', (error, stdout, stderr) => {
		// 	if (error) {
		// 		console.error(`javac exec error: ${error}`);
		// 		return;
		// 	}

		// 	exec('java e01', (error, stdout, stderr) => {
		// 		if (error) {
		// 			console.error(`java exec error: ${error}`);
		// 			return;
		// 		}	
		// 			console.log(`java stdout: ${stdout}`);
		// 			console.error(`java stderr: ${stderr}`);
		// 		})
		// 	});

		// 	console.log(`javac stdout: ${stdout}`);
		// 	console.error(`javac stderr: ${stderr}`);
	})
} catch (error) {
	
}