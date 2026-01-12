"use client";

import React from 'react';
import { Input } from '@heroui/input';
import { Button } from '@heroui/react';
import { ChevronDown, ChevronRight, PlusCircle, Trash2 } from 'lucide-react';

interface MaterialRow {
  id: number;
  index: string;
  material: string;
  thickness: number;
  width: number;
  density: number;
  length: number;
  kgM2: number;
  co2eKg: number;
  co2eM2: number;
  isDefault: boolean;
  subRows: Omit<MaterialRow, 'subRows' | 'index'>[];
}

interface MaterialDataTableProps {
  rows: MaterialRow[];
  setRows: React.Dispatch<React.SetStateAction<MaterialRow[]>>;
  expandedRows: Set<number>;
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  darkMode: boolean;
}

const MaterialDataTable: React.FC<MaterialDataTableProps> = ({ rows, setRows, expandedRows, setExpandedRows, darkMode }) => {

  const updateParentCo2eM2 = (rowsToUpdate: MaterialRow[]): MaterialRow[] => {
    return rowsToUpdate.map(row => {
      if (row.subRows && row.subRows.length > 0) {
        const subRowsSum = row.subRows.reduce((sum, subRow) => sum + subRow.co2eM2, 0);
        return { ...row, co2eM2: parseFloat(subRowsSum.toFixed(2)) };
      }
      // If there are no sub-rows, co2eM2 should be 0 for the parent
      return { ...row, co2eM2: 0 };
    });
  };

  const toggleRowExpansion = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleAddRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    const newRow: MaterialRow = {
      id: newId,
      index: `${rows.length + 1}.`,
      material: `新材料 ${newId}`,
      thickness: 0,
      width: 0,
      density: 0,
      length: 0,
      kgM2: 0,
      co2eKg: 0,
      co2eM2: 0,
      isDefault: false,
      subRows: [],
    };
    setRows([...rows, newRow]);
    setExpandedRows(prev => new Set(prev).add(newId));
  };

  const handleRemoveRow = (idToRemove: number) => {
    const newRows = rows.filter(row => row.id !== idToRemove);
    const reIndexedRows = newRows.map((row, index) => ({
      ...row,
      index: `${index + 1}.`
    }));
    setRows(reIndexedRows);
  };

  const handleAddSubRow = (parentId: number) => {
    let updatedRows = rows.map(row => {
      if (row.id === parentId) {
        const newSubId = row.subRows.length > 0 ? Math.max(...row.subRows.map(sr => sr.id)) + 1 : 1;
        const newSubRow = { id: newSubId, material: `${row.material}${newSubId}`, thickness: 0, width: 0, density: row.density, length: 0, kgM2: 0, co2eKg: row.co2eKg, co2eM2: 0, isDefault: false };
        return { ...row, subRows: [...row.subRows, newSubRow] };
      }
      return row;
    });
    setRows(updateParentCo2eM2(updatedRows));
    
    if (!expandedRows.has(parentId)) {
      const newExpandedRows = new Set(expandedRows);
      newExpandedRows.add(parentId);
      setExpandedRows(newExpandedRows);
    }
  };

  const handleRemoveSubRow = (parentId: number, subId: number) => {
    let updatedRows = rows.map(row => {
      if (row.id === parentId) {
        return { ...row, subRows: row.subRows.filter(sr => sr.id !== subId) };
      }
      return row;
    });
    setRows(updateParentCo2eM2(updatedRows));
  };

  const handleInputChange = (id: number, field: string, value: string | number, parentId?: number) => {
    let updatedRows = [...rows];

    if (parentId !== undefined) {
      // Update sub-row
      updatedRows = updatedRows.map(row => {
        if (row.id === parentId) {
          const newSubRows = row.subRows.map(subRow => {
            if (subRow.id === id) {
              const updatedSubRow = { ...subRow, [field]: value };
              const { thickness, width, density, length, co2eKg } = updatedSubRow;
              if (length > 0) {
                const kgM2 = (thickness * width * density) / length;
                updatedSubRow.kgM2 = parseFloat(kgM2.toFixed(2));
                updatedSubRow.co2eM2 = parseFloat((kgM2 * co2eKg).toFixed(2));
              } else {
                updatedSubRow.kgM2 = 0;
                updatedSubRow.co2eM2 = 0;
              }
              return updatedSubRow;
            }
            return subRow;
          });
          return { ...row, subRows: newSubRows };
        }
        return row;
      });
    } else {
      // Update parent row
      updatedRows = updatedRows.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === 'density' || field === 'co2eKg') {
            const newSubRows = updatedRow.subRows.map(subRow => {
              const updatedSubRow = { ...subRow, [field]: value };
              const { thickness, width, density, length, co2eKg } = updatedSubRow;
              if (length > 0) {
                const kgM2 = (thickness * width * density) / length;
                updatedSubRow.kgM2 = parseFloat(kgM2.toFixed(2));
                updatedSubRow.co2eM2 = parseFloat((kgM2 * co2eKg).toFixed(2));
              } else {
                updatedSubRow.kgM2 = 0;
                updatedSubRow.co2eM2 = 0;
              }
              return updatedSubRow;
            });
            return { ...updatedRow, subRows: newSubRows };
          }
          return updatedRow;
        }
        return row;
      });
    }

    setRows(updateParentCo2eM2(updatedRows));
  };

  const totalCo2eM2 = rows.reduce((sum, row) => sum + row.co2eM2, 0);

  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <thead className={`text-xs uppercase ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-700'}`}>
          <tr>
            <th scope="col" className="px-2 py-3 text-center w-12"></th>
            <th scope="col" className="px-2 py-3 text-center">No.</th>
            <th scope="col" className="px-2 py-3 text-center">材料/數據</th>
            <th scope="col" className="px-2 py-3 text-center">厚度(m)</th>
            <th scope="col" className="px-2 py-3 text-center">寬度(m)</th>
            <th scope="col" className="px-2 py-3 text-center">密度(kg/m3)</th>
            <th scope="col" className="px-2 py-3 text-center">長度(m)</th>
            <th scope="col" className="px-2 py-3 text-center">kg/m2</th>
            <th scope="col" className="px-2 py-3 text-center">kg Co2e/kg</th>
            <th scope="col" className="px-2 py-3 text-center">碳排放Co2 (kg Co2e/m2)</th>
            <th scope="col" className="px-2 py-3 text-center"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <React.Fragment key={row.id}>
              <tr className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} border-b`}>
                <td className="px-2 py-2 text-center">
                  <Button isIconOnly variant="light" size="sm" onPress={() => toggleRowExpansion(row.id)}>
                    {expandedRows.has(row.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </Button>
                </td>
                <td className="px-2 py-2 text-center">{row.index}</td>
                <td className="px-2 py-2">
                  {row.isDefault ? <span className={`flex justify-center ${darkMode ? 'text-white' : 'text-black'}`}>{row.material}</span> : <Input classNames={{input: `min-w-[100px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} value={row.material} onChange={(e) => handleInputChange(row.id, 'material', e.target.value)} />}
                </td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 text-center">{row.isDefault ? <span className={`${darkMode ? 'text-white' : 'text-black'}`}>{row.density}</span> : <Input classNames={{input: `min-w-[60px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} type="number" value={String(row.density)} onChange={(e) => handleInputChange(row.id, 'density', Number(e.target.value))} />}</td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 text-center">{row.isDefault ? <span className={`${darkMode ? 'text-white' : 'text-black'}`}>{row.co2eKg}</span> : <Input classNames={{input: `min-w-[60px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} type="number" value={String(row.co2eKg)} onChange={(e) => handleInputChange(row.id, 'co2eKg', Number(e.target.value))} />}</td>
                <td className={`px-2 py-2 text-center ${darkMode ? 'text-white' : 'text-black'}`}>{row.co2eM2}</td>
                <td className="px-2 py-2 text-center">
                  <div className="flex justify-center items-center">
                    {!row.isDefault && (
                      <Button isIconOnly className="bg-dark-danger" size="sm" onPress={() => handleRemoveRow(row.id)}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedRows.has(row.id) && (
                <>
                  {row.subRows.map(subRow => (
                    <tr key={subRow.id} className={`${darkMode ? 'bg-gray-700 border-gray-500' : 'bg-gray-300 border-gray-200'} border-b`}>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2">
                        <Input classNames={{input: `min-w-[100px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} value={subRow.material} onChange={(e) => handleInputChange(subRow.id, 'material', e.target.value, row.id)} />
                      </td>
                      <td className="px-2 py-2"><Input classNames={{input: `min-w-[60px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} type="number" value={String(subRow.thickness)} onChange={(e) => handleInputChange(subRow.id, 'thickness', Number(e.target.value), row.id)} /></td>
                      <td className="px-2 py-2"><Input classNames={{input: `min-w-[60px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} type="number" value={String(subRow.width)} onChange={(e) => handleInputChange(subRow.id, 'width', Number(e.target.value), row.id)} /></td>
                      <td className="px-2 py-2 text-center"><span className={`${darkMode ? 'text-white' : 'text-black'}`}>{subRow.density}</span></td>
                      <td className="px-2 py-2"><Input classNames={{input: `min-w-[60px] bg-transparent ${darkMode ? 'text-white' : 'text-black'}`, inputWrapper: "rounded-none"}} type="number" value={String(subRow.length)} onChange={(e) => handleInputChange(subRow.id, 'length', Number(e.target.value), row.id)} /></td>
                      <td className={`px-2 py-2 text-center ${darkMode ? 'text-white' : 'text-black'}`}>{subRow.kgM2}</td>
                      <td className="px-2 py-2 text-center"><span className={`${darkMode ? 'text-white' : 'text-black'}`}>{subRow.co2eKg}</span></td>
                      <td className={`px-2 py-2 text-center ${darkMode ? 'text-white' : 'text-black'}`}>{subRow.co2eM2}</td>
                      <td className="px-2 py-2 text-center">
                        <Button isIconOnly className="bg-dark-danger" size="sm" onPress={() => handleRemoveSubRow(row.id, subRow.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2"></td>
                    <td colSpan={9} className="px-2 py-1">
                      <Button fullWidth size="sm" onPress={() => handleAddSubRow(row.id)} className="justify-start">
                        <PlusCircle size={16} className="mr-2" />
                        Add Element
                      </Button>
                    </td>
                  </tr>
                </>
              )}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot className={`text-xs uppercase ${darkMode ? 'bg-gray-500 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
          <tr>
            <td className="px-3 py-3" colSpan={2}>
              <Button onPress={handleAddRow} size="sm">Add Material</Button>
            </td>
            <td colSpan={9} className={`text-center px-2 py-3 font-bold text-lg ${darkMode ? 'text-white' : 'text-black'}`}>總碳排放Co2 : {totalCo2eM2.toFixed(2)}  (kg Co2e/m2)</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default MaterialDataTable;