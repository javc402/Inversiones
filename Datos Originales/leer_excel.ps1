Add-Type -Path "C:\Program Files\Microsoft Office\Office*\EXCEL.EXE" -ErrorAction SilentlyContinue

$excelFile = "d:\Proyectos\Excel\Datos Originales\Data_Cristina.xlsx"
$excel = New-Object -ComObject Excel.Application -ErrorAction SilentlyContinue

if ($excel) {
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Open($excelFile)
    
    Write-Host "=== HOJAS DEL LIBRO ==="
    $sheetNames = @()
    foreach ($sheet in $workbook.Sheets) {
        Write-Host "- $($sheet.Name)"
        $sheetNames += $sheet.Name
    }
    
    # Analizar primera hoja
    Write-Host "`n=== CONTENIDO DE LA PRIMERA HOJA: $($sheetNames[0]) ==="
    $sheet = $workbook.Sheets(1)
    $usedRange = $sheet.UsedRange
    
    Write-Host "Filas: $($usedRange.Rows.Count)"
    Write-Host "Columnas: $($usedRange.Columns.Count)"
    
    # Mostrar encabezados (primeras 5 columnas)
    Write-Host "`nPrimera fila (encabezados):"
    for ($col = 1; $col -le [Math]::Min(10, $usedRange.Columns.Count); $col++) {
        $cell = $sheet.Cells(1, $col)
        $cellValue = $cell.Text
        Write-Host "${col}: $cellValue" -NoNewline
        if ($col -lt [Math]::Min(10, $usedRange.Columns.Count)) { Write-Host " | " -NoNewline }
    }
    Write-Host ""
    
    # Mostrar primeras 3 filas de datos
    Write-Host "`nPrimeras 3 filas de datos:"
    for ($row = 2; $row -le 4; $row++) {
        $rowData = @()
        for ($col = 1; $col -le [Math]::Min(5, $usedRange.Columns.Count); $col++) {
            $cellValue = $sheet.Cells($row, $col).Text
            $rowData += $cellValue
        }
        Write-Host "Fila $row: $($rowData -join ' | ')"
    }
    
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
} else {
    Write-Host "No se pudo inicializar Excel COM"
}
