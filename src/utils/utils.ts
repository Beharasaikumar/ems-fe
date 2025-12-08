
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    alert("No data to export");
    return;
  }
  
  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Convert to CSV string
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const val = row[header];
        // Handle strings with commas or quotes
        const stringVal = val === null || val === undefined ? '' : String(val);
        // Escape quotes
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
