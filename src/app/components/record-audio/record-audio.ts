import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-record-audio',
  templateUrl: './record-audio.html',
  styleUrls: ['./record-audio.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordAudio {
  isRecording = signal(false);
  isStopped = signal(false);
  audioUrl = signal<string | null>(null);
  audioBlob = signal<Blob | null>(null);
  errorMessage = signal<string | null>(null);
  recordingTime = signal('00:00');

  audioSaved = output<File>();
  closed = output<void>();

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: any;

  /**
   * Closes the component and cleans up resources.
   */
  close(): void {
    this.stopRecording();
    this.resetState();
    this.closed.emit();
  }

  /**
   * Starts the audio recording process.
   */
  startRecording(): void {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        this.isRecording.set(true);
        this.isStopped.set(false);
        this.errorMessage.set(null);
        this.resetAudio();
        
        this.mediaRecorder = new MediaRecorder(stream);
        
        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };
        
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.audioUrl.set(URL.createObjectURL(blob));
          this.audioBlob.set(blob);
          this.audioChunks = [];
          stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
        };
        
        this.mediaRecorder.start();
        this.startTimer();
      })
      .catch(err => {
        this.errorMessage.set('Could not access the microphone. Please ensure you have given permission.');
        console.error('Error accessing microphone:', err);
      });
  }

  /**
   * Stops the audio recording.
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.isStopped.set(true);
      this.stopTimer();
    }
  }

  /**
   * Saves the recorded audio and closes the component.
   */
  saveAudio(): void {
    if (this.audioBlob()) {
      const audioBlob = this.audioBlob()!;
      const audioFile = new File([audioBlob], `recording-${new Date().getTime()}.wav`, { type: 'audio/wav' });
      this.audioSaved.emit(audioFile);
      this.close(); // Close the component after saving
    }
  }

  /**
   * Resets the recording to allow for a new one.
   */
  resetRecording(): void {
    this.stopRecording();
    this.resetState();
  }

  /**
   * Resets the component's state to its initial values.
   */
  private resetState(): void {
    this.isRecording.set(false);
    this.isStopped.set(false);
    this.resetAudio();
    this.errorMessage.set(null);
    this.recordingTime.set('00:00');
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }
  }

  /**
   * Cleans up audio-related signals and resources.
   */
  private resetAudio(): void {
      const currentUrl = this.audioUrl();
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      this.audioUrl.set(null);
      this.audioBlob.set(null);
      this.audioChunks = [];
  }

  /**
   * Starts a timer to display the recording duration.
   */
  private startTimer(): void {
    let seconds = 0;
    this.recordingTime.set('00:00');
    this.recordingInterval = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      this.recordingTime.set(
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      );
    }, 1000);
  }

  /**
   * Stops the recording timer.
   */
  private stopTimer(): void {
    clearInterval(this.recordingInterval);
  }
}