# Deploy script - copy files from src/ to root and push to GitHub
Write-Host "📦 Copying files from src/ to root..." -ForegroundColor Green
Copy-Item -Path "src\*" -Destination "." -Recurse -Force

Write-Host "📝 Staging changes..." -ForegroundColor Green
git add .

Write-Host "💾 Committing..." -ForegroundColor Green
$message = if ($args.Count -gt 0) { $args[0] } else { "Update website" }
git commit -m $message

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Green
git push origin main

Write-Host "✅ Done! Your site will update in a few seconds." -ForegroundColor Cyan
