import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-doodle-create',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doodle-create.html',
  styleUrls: ['./doodle-create.css']
})
export class DoodleCreate implements AfterViewInit {
  // --- OUTPUTS ---
  // These events are sent to the parent component (PostCreate).
  @Output() doodleSaved = new EventEmitter<File>();
  @Output() closed = new EventEmitter<void>();

  // --- INTERNAL STATE ---
  @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') containerRef!: ElementRef<HTMLDivElement>;

  private ctx!: CanvasRenderingContext2D;
  
  // --- UI & Tool Signals ---
  activeTool = signal<'brush' | 'eraser'>('brush');
  brushColor = signal<string>('#E5A89B'); // Default color
  brushSize = signal<number>(5);
  isDrawing = signal<boolean>(false);
  
  // --- Canvas Dimensions ---
  canvasWidth = 0;
  canvasHeight = 0;
  
  // --- Color Presets ---
  presets = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];

  ngAfterViewInit() {
    // Use a timeout to ensure the container has rendered in the DOM and has a size.
    setTimeout(() => this.initializeCanvas(), 0);
  }

  @HostListener('window:resize')
  onResize() {
    this.initializeCanvas();
  }

  initializeCanvas() {
    if (!this.canvasRef?.nativeElement || !this.containerRef?.nativeElement) return;
    
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    canvas.style.width = `${this.canvasWidth}px`;
    canvas.style.height = `${this.canvasHeight}px`;
    canvas.width = this.canvasWidth * dpr;
    canvas.height = this.canvasHeight * dpr;

    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.clearCanvas(); // Fill with white and set context
  }

  updateContext() {
    if (!this.ctx) return;
    this.ctx.lineWidth = this.brushSize();
    this.ctx.strokeStyle = this.activeTool() === 'eraser' ? '#ffffff' : this.brushColor();
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.isDrawing.set(true);
    this.ctx.beginPath();
    const { x, y } = this.getCoordinates(event);
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y); 
    this.ctx.stroke();
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing()) return;
    event.preventDefault();
    const { x, y } = this.getCoordinates(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing()) return;
    this.isDrawing.set(false);
    this.ctx.closePath();
  }

  getCoordinates(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  setTool(tool: 'brush' | 'eraser') {
    this.activeTool.set(tool);
    this.updateContext();
  }

  updateColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.brushColor.set(input.value);
    if (this.activeTool() === 'eraser') this.setTool('brush');
    this.updateContext();
  }

  setPresetColor(color: string) {
    this.brushColor.set(color);
    if (this.activeTool() === 'eraser') this.setTool('brush');
    this.updateContext();
  }

  updateSize(event: Event) {
    const input = event.target as HTMLInputElement;
    this.brushSize.set(Number(input.value));
    this.updateContext();
  }

  clearCanvas() {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.updateContext();
  }

  /**
   * Saves the doodle and emits the file to the parent component.
   */
  async saveDoodle(): Promise<void> {
    const blob = await this.getCanvasBlob();
    if (!blob) return;
    const doodleFile = new File([blob], `doodle-${Date.now()}.png`, { type: 'image/png' });
    this.doodleSaved.emit(doodleFile);
  }

  /**
   * Emits the close event to the parent component.
   */
  close(): void {
    this.closed.emit();
  }

  private getCanvasBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.canvasRef.nativeElement.toBlob(resolve, 'image/png');
    });
  }
}