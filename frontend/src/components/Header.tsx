import './Header.css';

interface HeaderProps {
  onGenerateUrl: () => void;
}

export function Header({ onGenerateUrl }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">REST Endpoint Analyser</h1>
        <button className="btn-generate" onClick={onGenerateUrl}>
          + Generate New URL
        </button>
      </div>
    </header>
  );
}
