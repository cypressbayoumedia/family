
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth, signInWithCustomToken } from '@angular/fire/auth';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join',
  templateUrl: './join.html',
  styleUrls: ['./join.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class JoinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private functions = inject(Functions);
  private auth = inject(Auth);

  public isLoading = true;
  public error: string | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code) {
        this.exchangeCode(code);
      } else {
        this.error = 'No invitation code provided.';
        this.isLoading = false;
      }
    });
  }

  private async exchangeCode(code: string): Promise<void> {
    try {
      const exchangeCodeFn = httpsCallable(this.functions, 'exchangeCodeForToken');
      const result = await exchangeCodeFn({ code });
      const token = (result.data as { customToken: string }).customToken;

      if (token) {
        await signInWithCustomToken(this.auth, token);
        this.router.navigate(['/home']);
      } else {
        this.error = 'Failed to retrieve authentication token.';
      }
    } catch (err) {
      console.error('Error exchanging code for token:', err);
      this.error = 'Invalid or expired invitation code.';
    } finally {
      this.isLoading = false;
    }
  }
}
