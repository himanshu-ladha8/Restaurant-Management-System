using RMS.ServiceFramework.Data;
using RMS.ServiceFramework.Interfaces;
using System.Security.Cryptography;
using System.Text;
using RMS.ServiceFramework.Models;

namespace RMS.ServiceFramework.ServiceDB
{
    public class UserService : IUserService
    {
        private readonly RMSDbContext _context;

        public UserService(RMSDbContext context)
        {
            _context = context;
        }

        public void CreateUser(string userName, string password, string role)
        {
            if (_context.Users.Any(u => u.Email == userName))
            {
                throw new ArgumentException("Email already exists");
            }

            var user = new User
            {
                Email = userName,
                FullName = userName,
                PasswordHash = HashPassword(password),
                UserType = role,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            _context.SaveChanges();
        }

        private string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(password);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }
    }
}
