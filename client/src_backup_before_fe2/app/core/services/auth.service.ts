import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminLoginResponse, AdminMeResponse, AdminUser } from '../models/admin.models';

const TOKEN_KEY = 'madlenianum_admin_token';
const ADMIN_KEY = 'madlenianum_admin_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly adminSignal = signal<AdminUser | null>(this.loadStoredAdmin());

  readonly token = computed(() => this.tokenSignal());
  readonly admin = computed(() => this.adminSignal());
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(email: string, password: string) {
    return this.http
      .post<AdminLoginResponse>(`${this.apiUrl}/admin/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          this.setSession(response.token, response.admin);
        })
      );
  }

  me() {
    return this.http.get<AdminMeResponse>(`${this.apiUrl}/admin/auth/me`).pipe(
      tap((response) => {
        this.adminSignal.set(response.admin);
        localStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);

    this.tokenSignal.set(null);
    this.adminSignal.set(null);

    this.router.navigate(['/admin/login']);
  }

  getTokenSnapshot(): string | null {
    return this.tokenSignal();
  }

  private setSession(token: string, admin: AdminUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));

    this.tokenSignal.set(token);
    this.adminSignal.set(admin);
  }

  private loadStoredAdmin(): AdminUser | null {
    const rawValue = localStorage.getItem(ADMIN_KEY);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as AdminUser;
    } catch {
      localStorage.removeItem(ADMIN_KEY);
      return null;
    }
  }
}
