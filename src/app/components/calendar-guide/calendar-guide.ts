import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-calendar-guide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="guide-overlay" (click)="close.emit()">
      <div class="guide-card" (click)="$event.stopPropagation()">
        <div class="icon-header">
          <span class="material-symbols-rounded">calendar_month</span>
        </div>
        <h3>How Family Calendar Works</h3>
        
        <div class="step">
          <span class="step-num">1</span>
          <div class="step-content">
            <strong>Plan Moments</strong>
            <p>Create events for birthdays, family trips, or just a casual Sunday dinner.</p>
          </div>
        </div>

        <div class="step">
          <span class="step-num">2</span>
          <div class="step-content">
            <strong>Coordinate Together</strong>
            <p>Use the "To-Bring" list to organize potlucks, supplies, and gifts.</p>
          </div>
        </div>

        <div class="step">
          <span class="step-num">3</span>
          <div class="step-content">
            <strong>Chat & Discuss</strong>
            <p>Every event has its own chat. Discuss details without cluttering the main feed.</p>
          </div>
        </div>

        <button class="got-it-btn" (click)="close.emit()">Got it</button>
      </div>
    </div>
  `,
  styles: [`
    .guide-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease-out;
    }

    .guide-card {
      background: #FDFBF7; /* Vintage Stationery */
      color: #333;
      width: 100%;
      max-width: 340px;
      padding: 32px 24px;
      border-radius: 24px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .icon-header {
      width: 64px;
      height: 64px;
      background: var(--accent-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .icon-header span {
      font-size: 32px;
    }

    h3 {
      font-family: 'Roboto Mono', monospace;
      font-size: 1.2rem;
      margin-bottom: 24px;
      color: #333;
    }

    .step {
      display: flex;
      align-items: flex-start;
      text-align: left;
      gap: 16px;
      margin-bottom: 20px;
    }

    .step-num {
      background: rgba(0,0,0,0.05);
      color: #666;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-content strong {
      display: block;
      font-size: 0.95rem;
      margin-bottom: 4px;
    }

    .step-content p {
      font-size: 0.85rem;
      color: #666;
      line-height: 1.4;
      margin: 0;
    }

    .got-it-btn {
      width: 100%;
      padding: 14px;
      background: #333;
      color: white;
      border: none;
      border-radius: 999px;
      font-size: 1rem;
      font-weight: 600;
      margin-top: 12px;
      cursor: pointer;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 600px) {
      .guide-overlay {
        align-items: flex-end;
        padding: 0;
      }

      .guide-card {
        border-radius: 24px 24px 0 0;
        max-width: 100%;
        padding: 32px 24px calc(32px + env(safe-area-inset-bottom)) 24px; /* Dynamic safe area padding */
        animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
    }

    @keyframes slideUpMobile {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `]
})
export class CalendarGuide {
  close = output<void>();
}
