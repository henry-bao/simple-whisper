**Instructions:**

1. Login into the raspberry pi shell:
‘ssh pi@10.56.129.105’
password: raspberry

2. Cd into /Desktop/end-to-end

Make sure to activate environment:
‘pyenv activate plotterenv’

3. Run 
‘Python direct_plotter.py’ 

Then, in another shell on your local
Create a .wav audio recording and store locally:
Call a Post request to the pi server api:

Example: curl -X POST -F "audio=@hello.wav" http://10.56.129.225:8080/api/transcribe
(In this case I have a hello.wav file stored locally in the directory I call the command from)

You should see the postcard transcribe the text.
