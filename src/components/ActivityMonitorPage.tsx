import React from 'react';
import { Filter, User, MapPin, PlusSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProgressCard } from './ProgressCard';
import { ProgressBar } from './ProgressBar';
import '../styles/ActivityMonitorPage.css'; // Create this CSS file
import '../styles/OrdersPage.css'; // Reusing table styles

// Mock Data
const summaryData = [
  { title: 'Suministros', value: 3604, percentage: 100 },
  { title: 'Asignados', value: 3604, percentage: 100 },
  { title: 'Descargados', value: 3604, percentage: 100 },
  { title: 'Finalizados', value: 1007, percentage: 27, className: 'finalizados' }, // Add className for specific styling
];

const monitorData = [
  { id: 1, encargado: 'hemande escliver yumbato villalrgo', avatar: 'path/to/avatar1.png', asignados: 1007, descargados: 1007, finalizados: 1007, progreso: 100 },
  { id: 2, encargado: 'sergio concha taminche', avatar: 'path/to/avatar2.png', asignados: 1647, descargados: 1647, finalizados: 0, progreso: 0 },
  { id: 3, encargado: 'rider lee rhopi curinuqui', avatar: 'path/to/avatar3.png', asignados: 1459, descargados: 1459, finalizados: 0, progreso: 0 },
];

export const ActivityMonitorPage: React.FC = () => {
  return (
    <>
      <div className="dashboard-header-path">
        Inicio / Monitoreo de actividades
      </div>

      {/* Top Summary Cards */}
      <div className="summary-cards-grid">
        {summaryData.map((item, index) => (
          <div key={index} className={item.className ? `progress-card ${item.className}` : 'progress-card'}>
             <ProgressCard 
               title={item.title} 
               value={item.value} 
               percentage={item.percentage} 
             />
          </div>
        ))}
      </div>

      {/* Filter Button */}
      <div className="filter-section">
        <button className="filter-btn">
          <Filter size={18} style={{ marginRight: '8px' }} />
          Filtrar Busqueda
        </button>
      </div>

      {/* Main Table Card */}
      <div className="orders-card"> {/* Reuse card style */}
        <div className="table-controls">
          <div className="show-entries">
            <label htmlFor="show-entries">Mostrar </label>
            <select id="show-entries">
              <option value="10">10</option>
              <option value="25">25</option>
            </select>
            <span> registros</span>
          </div>
          <div className="search-bar">
            <label htmlFor="search-table">Buscar: </label>
            <input id="search-table" type="text" />
          </div>
        </div>

        <table className="orders-table monitor-table"> {/* Add monitor-table class */}
          <thead>
            <tr>
              <th>#</th>
              <th>Encargado</th>
              <th>Asignados</th>
              <th>Descargados</th>
              <th>Finalizados</th>
              <th>Progreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {monitorData.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>
                  <div className="encargado-cell">
                    {/* Placeholder for avatar image */}
                    <div className="avatar-placeholder">
                      <User size={18} />
                    </div>
                    <span>{row.encargado}</span>
                  </div>
                </td>
                <td><span className="quantity-badge">{row.asignados}</span></td>
                <td><span className="quantity-badge">{row.descargados}</span></td>
                <td><span className="quantity-badge">{row.finalizados}</span></td>
                <td>
                  <ProgressBar percentage={row.progreso} />
                </td>
                <td>
                  <div className="action-buttons-group">
                    <button className="action-btn map-btn">
                      <MapPin size={16} />
                    </button>
                    <button className="action-btn assign-btn">
                      <PlusSquare size={16} />
                    </button>
                    <button className="action-btn delete-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="table-pagination">
          <span>Mostrando registros del 1 al 3 de un total de 3</span>
          <div className="pagination-controls">
            <button className="pagination-btn">
              <ChevronLeft size={16} />
            </button>
            <button className="pagination-btn active">1</button>
            <button className="pagination-btn">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};