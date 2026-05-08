import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumenMes } from './resumen-mes';

describe('ResumenMes', () => {
  let component: ResumenMes;
  let fixture: ComponentFixture<ResumenMes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenMes],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenMes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
