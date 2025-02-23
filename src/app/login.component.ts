import { Router } from '@angular/router';

// ...
export class LoginComponent {
  // ...
  constructor(
    // ...
    private router: Router
  ) {}

  goToRegister() {
    this.router.navigate(['/register']);
  }
}