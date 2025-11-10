import { Component, input, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import WaveSurfer from 'wavesurfer.js';

@Component({
  selector: 'app-audio-waveform',
  imports: [CommonModule],
  templateUrl: './audio-waveform.html',
  styleUrl: './audio-waveform.css',
})
export class AudioWaveform implements AfterViewInit, OnDestroy {
  audioUrl = input.required<string>();

  @ViewChild('waveform') waveformContainer!: ElementRef<HTMLDivElement>;
  private wavesurfer?: WaveSurfer;

  isPlaying = signal(false);
  isLoading = signal(true);

  constructor() {
    effect(() => {
      // This effect handles any subsequent changes to the URL after the component has initialized.
      if (!this.wavesurfer) return;

      const url = this.audioUrl();
      
      // THE FIX IS HERE: We have removed the problematic 'getSrc()' check.
      // We now simply tell WaveSurfer to load the new URL. The library is smart
      // enough to handle this efficiently.
      this.isLoading.set(true);
      this.wavesurfer.load(url);
    });
  }

  ngAfterViewInit(): void {
    this.initializeWaveSurfer();
  }

  ngOnDestroy(): void {
    this.wavesurfer?.destroy();
  }

  private initializeWaveSurfer(): void {
    if (this.waveformContainer?.nativeElement) {
      this.wavesurfer = WaveSurfer.create({
        container: this.waveformContainer.nativeElement,
        waveColor: '#414949',//#969484
        progressColor: '#BB7F6A',
        barWidth: 8,
        barRadius: 30,
        barGap: 2,
        cursorWidth: 0,
      });

      this.wavesurfer.on('play', () => this.isPlaying.set(true));
      this.wavesurfer.on('pause', () => this.isPlaying.set(false));
      this.wavesurfer.on('finish', () => this.isPlaying.set(false));
      this.wavesurfer.on('ready', () => this.isLoading.set(false));
      this.wavesurfer.on('error', (err) => {
        console.error('WaveSurfer error:', err);
        this.isLoading.set(false);
      });
      
      // Load the initial audio URL right after initialization.
      this.wavesurfer.load(this.audioUrl());
    }
  }

  togglePlayPause(): void {
    if (this.wavesurfer) {
      this.wavesurfer.playPause();
    }
  }
}