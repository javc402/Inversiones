# Conectar a Excel
$excelFile = "d:\Proyectos\Excel\Datos Originales\Data_Cristina.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$workbook = $excel.Workbooks.Open($excelFile)

Write-Host "====== ANALISIS DEL ARCHIVO EXCEL ======"
Write-Host ""

# Listar hojas
Write-Host "HOJAS DISPONIBLES:"
$sheetIndex = 1
foreach ($sheet in $workbook.Sheets) {
    $rows = $sheet.UsedRange.Rows.Count
    $cols = $sheet.UsedRange.Columns.Count
    Write-Host "  $sheetIndex. $($sheet.Name) - ${rows}x${cols}"
    $sheetIndex++
}

Write-Host ""
Write-Host "====== ANALIZANDO HOJA 1: Par 2026 ======"

$sheet1 = $workbook.Sheets(1)
$usedRange = $sheet1.UsedRange

# Encabezados
Write-Host ""
Write-Host "ENCABEZADOS (primeros 15):"
$headers = @()
for ($i = 1; $i -le 15; $i++) {
    $value = $sheet1.Cells(1, $i).Text
    $headers += $value
    Write-Host "  Col $i : $value"
}

# Datos de ejemplo
Write-Host ""
Write-Host "DATOS DE EJEMPLO (primeras 3 filas):"
for ($row = 2; $row -le 4; $row++) {
    $rowText = "Fila ${row}: "
    for ($col = 1; $col -le 5; $col++) {
        $val = $sheet1.Cells($row, $col).Text
        $rowText += "$val | "
    }
    Write-Host $rowText
}

# Estadisticas
Write-Host ""
Write-Host "ESTADISTICAS:"
Write-Host "  Filas totales: $($usedRange.Rows.Count)"
Write-Host "  Columnas totales: $($usedRange.Columns.Count)"

$workbook.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host ""
Write-Host "====== PROCESO COMPLETADO ======"
