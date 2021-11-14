# exercise-checker

A simple checker program for a university course.

This program is periodically called in AWS EC2 instance with [node-schedule](https://github.com/node-schedule/node-schedule).
[DriveSync](https://github.com/MStadlmeier/drivesync) is used to fetch folders with given directory name structure (tamk-java-* on this course) that includes Java exercises.
The program iteratively goes through all Java files and reports results back.

Here are the steps the program goes through:
1. Finds all DriveSync fetched directories with given directory name structure (tamk-java-* on our course) from root
2. Iterates over all found directories
3. Creates a report text file inside current directory if it doesn't exist yet
4. Finds all Java (.java) files inside current directory
5. Iterates over all found Java files
6. Checks if current file already has a report mark on report file
7. If file is already checked as "OK" or "IN MANUAL CHECK", skip to next file
8. Compile the current file
9. Add to report file if an error was prompted from compiling the file
10. Check if the file should be manually checked or not
11. If yes, add "IN MANUAL CHECK" to report file and skip to next file
12. Run the file
13. Add to report file if an error was prompted from running the file
14. Check if the file output is the same as model answer
15. If yes/no, add "OK"/"WRONG" respectively to report file
16. Sort report file
