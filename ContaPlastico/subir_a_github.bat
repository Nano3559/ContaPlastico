@echo off
echo ====================================================
echo  Subiendo Proyecto y Landing Page a GitHub (feature/Abel)
echo ====================================================

git init
git remote remove origin 2>nul
git remote add origin https://github.com/Nano3559/ContaPlastico.git
git checkout -B feature/Abel
git add .
git commit -m "feat: landing page web y estructura organizada para backend y mobile"
git push -u origin feature/Abel

echo ====================================================
echo  PROCESO COMPLETADO
echo  Ahora ve a GitHub y haz clic en 'Compare & pull request'
echo ====================================================
pause
