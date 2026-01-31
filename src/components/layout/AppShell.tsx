import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Toolbar } from './Toolbar';
import { SymbolLibrary } from '../sidebar/SymbolLibrary';
import { RoomTree } from '../tree/RoomTree';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { InstallationCanvas } from '../canvas/InstallationCanvas';
import { Stromlaufplan } from '../views/Stromlaufplan';
import { Aufbauplan } from '../views/Aufbauplan';
import { Stueckliste } from '../views/Stueckliste';
import { Bestellliste } from '../views/Bestellliste';
import { Symboluebersicht } from '../views/Symboluebersicht';

export function AppShell() {
  const activeView = useAppStore((s) => s.activeView);
  const selectedSymbolId = useAppStore((s) => s.selectedSymbolId);
  const [searchTerm, setSearchTerm] = useState('');

  const isFullWidth = activeView === 'symboluebersicht';

  const renderView = () => {
    switch (activeView) {
      case 'symboluebersicht':
        return <Symboluebersicht />;
      case 'installationsplan':
        return <InstallationCanvas />;
      case 'stromlaufplan':
        return <Stromlaufplan />;
      case 'aufbauplan':
        return <Aufbauplan />;
      case 'stueckliste':
        return <Stueckliste />;
      case 'bestellliste':
        return <Bestellliste />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 text-gray-900">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        {!isFullWidth && (
          <aside className="w-72 border-r border-gray-200 bg-white flex flex-col min-h-0">
            <RoomTree />
            <div className="border-t border-gray-200 flex-1 min-h-0 flex flex-col">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Symbole suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <SymbolLibrary searchTerm={searchTerm} />
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-0 min-w-0">
          {renderView()}
        </main>

        {/* Right sidebar - Properties */}
        {selectedSymbolId && activeView === 'installationsplan' && (
          <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <PropertiesPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
