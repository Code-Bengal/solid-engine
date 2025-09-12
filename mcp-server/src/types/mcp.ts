// Core MCP Server Types
export interface PageInfo {
  title: string;
  url: string;
  path: string;
  timestamp: string;
}

export interface ClickableElement {
  name: string;
  selector: string;
  text?: string;
  description?: string;
  type: string;
  visible?: boolean;
  isVisible?: boolean;
  elementType?: 'clickable' | 'input';
  position?: {
    x: number;
    y: number;
  };
}

export interface ClickResult {
  success: boolean;
  elementName: string;
  message: string;
  newUrl?: string;
  currentPage?: PageInfo;
}

export interface NavigationResult {
  success: boolean;
  targetPage: string;
  currentUrl: string;
  message: string;
  currentPage?: PageInfo;
}

export interface FillInputResult {
  success: boolean;
  inputName: string;
  message: string;
  error?: string;
}

export interface BookingFormResult {
  success: boolean;
  fieldsUpdated: string[];
  message: string;
  validationErrors?: string[];
}
