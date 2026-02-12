using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RMS.ServiceFramework.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace RMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _service;
        public UserController(IUserService service)
        {
            _service = service;       
        }

        //[HttpGet("all")]
        //public IActionResult GetAllUsers()
        //{
        //    return _service.GetAllUsers();
        //}
        [HttpPost]
        public IActionResult CreateUser(string userName, string password, string role)
        {
            _service.CreateUser(userName, password, role);
            return Ok();
        }

    }
}
