# =========================
# BUILD STAGE
# =========================
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy solution file
COPY ../*.sln ./

# Copy project files
COPY ../RMS/RMS.csproj RMS/
COPY ../RMS.EntityFramework/RMS.EntityFramework.csproj RMS.EntityFramework/
COPY ../RMS.ServiceFramework/RMS.ServiceFramework.csproj RMS.ServiceFramework/

# Restore dependencies
RUN dotnet restore

# Copy everything
COPY .. .

# Publish
WORKDIR /src/RMS
RUN dotnet publish -c Release -o /app/publish

# =========================
# RUNTIME STAGE
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "RMS.dll"]
