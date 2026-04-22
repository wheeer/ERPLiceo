import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Signal para manejar reactivamente el estado del tema en toda la app
  public isDarkMode = signal<boolean>(true);

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    // Modo Oscuro por defecto, como solicitaste para mantener el estilo del login
    const savedTheme = localStorage.getItem('erp_theme');
    if (savedTheme === 'light') {
      this.isDarkMode.set(false);
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    } else {
      this.isDarkMode.set(true);
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }

  public toggleTheme() {
    this.isDarkMode.update(dark => !dark);
    if (this.isDarkMode()) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      localStorage.setItem('erp_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('erp_theme', 'light');
    }
  }
}
