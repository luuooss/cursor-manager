$root = 'C:/Users/2uf/Desktop/curseur/hello kitty'
$styles = @('Default', 'Style 2', 'Style 3', 'Style 4', 'Style 5', 'Style 6', 'Style 7', 'Style 8', 'Style A', 'Style B', 'Style C')
$files = Get-ChildItem -Path $root -File

foreach ($s in $styles) {
    $dest = "$root/$s/"
    foreach ($f in $files) {
        Copy-Item $f.FullName $dest -Force -ErrorAction SilentlyContinue
    }
}
