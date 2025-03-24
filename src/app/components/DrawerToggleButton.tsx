'use client';

interface DrawerToggleButtonProps {
  onClick: () => void;
  isDrawerOpen: boolean;
}

export default function DrawerToggleButton({ onClick, isDrawerOpen }: DrawerToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed left-0 top-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-r-md shadow-md transition-colors z-40"
      aria-label={isDrawerOpen ? "Close recordings drawer" : "Open recordings drawer"}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-6 w-6" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        {isDrawerOpen ? (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7" 
          />
        ) : (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 6h16M4 12h16M4 18h16" 
          />
        )}
      </svg>
    </button>
  );
} 