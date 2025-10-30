import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DropdownOption {
  id: number;
  name: string;
  [key: string]: any;
}

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-dropdown.component.html',
  styleUrls: ['./searchable-dropdown.component.scss'],
})
export class SearchableDropdownComponent implements OnInit, OnChanges {
  @Input() options: DropdownOption[] = [];
  @Input() selectedValue: number | null | undefined = null;
  @Input() multiSelect: boolean = false; // enable multiple selection mode
  @Input() selectedValues: number[] = []; // used when multiSelect=true
  @Input() placeholder: string = '-- Chọn --';
  @Input() disabled: boolean = false;
  @Input() showAddButton: boolean = false;
  @Input() addButtonTitle: string = 'Thêm mới';
  @Output() selectionChange = new EventEmitter<number | null>();
  @Output() selectionChangeMulti = new EventEmitter<number[]>();
  @Output() addButtonClick = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  filteredOptions: DropdownOption[] = [];
  searchTerm: string = '';
  isOpen: boolean = false;
  selectedOption: DropdownOption | null = null;
  selectedOptionName: string = '';

  ngOnInit() {
    this.initializeOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options'] || changes['selectedValue']) {
      this.initializeOptions();
    }
  }

  initializeOptions() {
    this.filteredOptions = [...this.options];
    if (this.multiSelect) {
      // Build display label from selected values list
      const nameList = this.options
        .filter((opt) => this.selectedValues?.includes(opt.id))
        .map((opt) => opt.name);
      this.selectedOptionName = nameList.join(', ');
      this.selectedOption = null;
    } else {
      this.selectedOption = this.options.find((opt) => opt.id === this.selectedValue) || null;
      this.selectedOptionName = this.selectedOption?.name || '';
    }
    this.searchTerm = ''; // Reset search term
  }

  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter((option) =>
        option.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  onOptionSelect(option: DropdownOption) {
    if (this.multiSelect) {
      const id = option.id;
      const current = new Set(this.selectedValues || []);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      this.selectedValues = Array.from(current);
      const nameList = this.options
        .filter((opt) => this.selectedValues.includes(opt.id))
        .map((opt) => opt.name);
      this.selectedOptionName = nameList.join(', ');
      this.selectionChangeMulti.emit(this.selectedValues);
      // keep dropdown open for multi-select
    } else {
      this.selectedOption = option;
      this.selectedValue = option.id;
      this.selectedOptionName = option.name;
      this.searchTerm = ''; // Clear search term after selection
      this.isOpen = false;
      this.selectionChange.emit(option.id);
    }
  }

  onInputFocus() {
    this.isOpen = true;
    this.searchTerm = '';
    this.onSearchChange();
  }

  onInputBlur() {
    // Delay to allow option click to register
    setTimeout(() => {
      this.isOpen = false;
      this.searchTerm = ''; // Clear search term when closing
    }, 200);
  }

  onAddButtonClick() {
    this.addButtonClick.emit();
  }

  clearSelection() {
    if (this.multiSelect) {
      this.selectedValues = [];
      this.selectedOptionName = '';
      this.searchTerm = '';
      this.selectionChangeMulti.emit([]);
    } else {
      this.selectedOption = null;
      this.selectedValue = null;
      this.selectedOptionName = '';
      this.searchTerm = '';
      this.selectionChange.emit(null);
    }
  }

  toggleDropdown() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.searchTerm = ''; // Clear search term when opening
        this.onSearchChange();
        // Focus search input after view update
        setTimeout(() => {
          this.searchInput?.nativeElement.focus();
        }, 0);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.isOpen && this.dropdownContainer) {
      const clickedInside = this.dropdownContainer.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.isOpen = false;
        this.searchTerm = '';
      }
    }
  }
}
