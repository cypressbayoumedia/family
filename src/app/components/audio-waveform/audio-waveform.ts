import { Component, input, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import WaveSurfer from 'wavesurfer.js';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-audio-waveform',
  imports: [CommonModule, MatIconModule],
  templateUrl: './audio-waveform.html',
  styleUrl: './audio-waveform.css',
})
export class AudioWaveform implements AfterViewInit, OnDestroy {
  audioUrl = input.required<string>();
  autoplay = input(false); // New: Autoplay input

  audioEnded = output<void>(); // New: Output event

  @ViewChild('waveform') waveformContainer!: ElementRef<HTMLDivElement>;
  private wavesurfer?: WaveSurfer;

  isPlaying = signal(false);
  isLoading = signal(true);

  constructor() {
    effect(() => {
      if (!this.wavesurfer) return;
      const url = this.audioUrl();
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
        waveColor: '#414949',
        progressColor: '#BB7F6A',
        barWidth: 8,
        barRadius: 30,
        barGap: 2,
        cursorWidth: 0,
        height: 100, // Explicit height for the waveform
      });

      this.wavesurfer.on('play', () => this.isPlaying.set(true));
      this.wavesurfer.on('pause', () => this.isPlaying.set(false));
      this.wavesurfer.on('finish', () => {
        this.isPlaying.set(false);
        this.audioEnded.emit(); // Emit event on finish
      });
      this.wavesurfer.on('ready', () => {
        this.isLoading.set(false);
        if (this.autoplay()) {
          this.wavesurfer?.play();
        }
      });
      this.wavesurfer.on('error', (err) => {
        console.error('WaveSurfer error:', err);
        this.isLoading.set(false);
      });
      
      this.wavesurfer.load(this.audioUrl());
    }
  }

  togglePlayPause(): void {
    if (this.wavesurfer) {
      this.wavesurfer.playPause();
    }
  }
}
