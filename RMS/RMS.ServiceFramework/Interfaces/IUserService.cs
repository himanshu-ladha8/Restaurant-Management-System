namespace RMS.ServiceFramework.Interfaces
{
    public interface IUserService
    {
        // Registration for customers and restaurant admins
        void CreateUser(string userName, string password, string role);
    }
}
