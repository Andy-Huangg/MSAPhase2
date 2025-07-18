using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Repositories;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using backend.WebSockets;

namespace backend
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            builder.Configuration.AddUserSecrets<Program>();
            // Add services to the container.
            builder.Services.AddControllers();


            // Configure DbContext before building the app
            var connectionString = builder.Configuration.GetConnectionString("AzureSqlConnection");
            if (builder.Environment.IsDevelopment())
            {
                builder.Configuration.AddUserSecrets<Program>();
                builder.Services.AddDbContext<AppDbContext>(options =>
                    // options.UseInMemoryDatabase("Student"));
                    options.UseSqlServer(connectionString));
            }
            else
            {
                builder.Services.AddDbContext<AppDbContext>(options =>
                    // options.UseInMemoryDatabase("Student"));
                    options.UseSqlServer(connectionString));
            }

            builder.Services.AddScoped<IChatRepository, ChatRepository>();
            builder.Services.AddScoped<ICourseRepository, CourseRepository>();
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IUserPreferenceRepository, UserPreferenceRepository>();
            builder.Services.AddScoped<IStudyBuddyRepository, StudyBuddyRepository>();
            builder.Services.AddScoped<IPrivateMessageRepository, PrivateMessageRepository>();
            builder.Services.AddScoped<IAnonymousNameService, AnonymousNameService>();


            // Configure JWT Auth
            var jwtKey = builder.Configuration["Jwt:Key"];
            var jwtIssuer = builder.Configuration["Jwt:Issuer"];
            var jwtAudience = builder.Configuration["Jwt:Audience"];

            if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
            {
                throw new InvalidOperationException("JWT configuration is missing or incomplete");
            }

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtIssuer,
                    ValidAudience = jwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
            });
            builder.Services.AddAuthorization();

            // Setup CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend",
                    policy =>
                    {
                        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "https://msa-phase2.vercel.app", "https://course-connect-andy-huanggs-projects.vercel.app")
                              .AllowAnyHeader()
                              .AllowAnyMethod();
                    });
            });


            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            // Add Swagger with JWT configuration
            builder.Services.AddSwaggerGen(options =>
            {
                options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Description = "Enter valid JWT token \nExample: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                });

                options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
                });
            });

            var app = builder.Build();

            // Use Web Sockets
            app.UseWebSockets();

            app.Map("/ws/chat", async (HttpContext context) =>
            {
                if (context.WebSockets.IsWebSocketRequest)
                {
                    // Validate before accepting WebSocket connection
                    var chatRepo = context.RequestServices.GetRequiredService<IChatRepository>();
                    var courseRepo = context.RequestServices.GetRequiredService<ICourseRepository>();
                    var anonymousNameService = context.RequestServices.GetRequiredService<IAnonymousNameService>();
                    var userRepo = context.RequestServices.GetRequiredService<IUserRepository>();

                    // Perform validation first
                    var validationResult = await WebSocketHandler.ValidateWebSocketConnectionAsync(context, courseRepo);
                    if (!validationResult.IsValid)
                    {
                        context.Response.StatusCode = validationResult.StatusCode;
                        await context.Response.WriteAsync(validationResult.ErrorMessage);
                        return;
                    }

                    // Only accept WebSocket connection if validation passes
                    using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
                    await WebSocketHandler.HandleChatConnectionAsync(context, webSocket, chatRepo, courseRepo, anonymousNameService, userRepo);
                }
                else
                {
                    context.Response.StatusCode = 400;
                }
            });

            app.UseCors("AllowFrontend");

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();

            }

            app.UseHttpsRedirection();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();

            app.Run();
        }
    }
}
